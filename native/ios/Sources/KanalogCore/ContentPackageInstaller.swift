import Foundation
import CryptoKit

public struct ManifestFile: Codable, Equatable, Sendable {
    public var path: String
    public var sha256: String
    public var bytes: Int
    public init(path: String, sha256: String, bytes: Int) { self.path = path; self.sha256 = sha256; self.bytes = bytes }
}
public struct PackageManifest: Codable, Equatable, Sendable {
    public var schemaVersion: Int
    public var packageId: String
    public var version: String
    public var files: [ManifestFile]
    public init(schemaVersion: Int = 1, packageId: String, version: String, files: [ManifestFile]) {
        self.schemaVersion = schemaVersion; self.packageId = packageId; self.version = version; self.files = files
    }
}
public enum PackageIntegrity {
    public static func digest(_ url: URL, maximumBytes: Int = ContentPackage.maximumBytes) throws -> (String, Int) {
        let handle = try FileHandle(forReadingFrom: url)
        defer { try? handle.close() }
        var sha = SHA256(); var bytes = 0
        while let chunk = try handle.read(upToCount: 1024 * 1024), !chunk.isEmpty {
            bytes += chunk.count
            guard bytes <= maximumBytes else { throw CoreError.tooLarge }
            sha.update(data: chunk)
        }
        return (sha.finalize().map { String(format: "%02x", $0) }.joined(), bytes)
    }
    public static func check(_ url: URL, expected: ManifestFile) throws {
        guard expected.bytes >= 0, expected.bytes <= ContentPackage.maximumBytes,
              expected.sha256.range(of: "^[a-fA-F0-9]{64}$", options: .regularExpression) != nil else { throw CoreError.invalidContent }
        let (hash, bytes) = try digest(url)
        guard hash == expected.sha256.lowercased(), bytes == expected.bytes else { throw CoreError.integrityMismatch }
    }
}
/// Network-free verification and installation. Unreferenced content-addressed media may remain
/// after an interrupted install; live notes and progress are replaced in one store transaction.
public struct ContentPackageInstaller: Sendable {
    public let store: LocalStudyStore
    public init(store: LocalStudyStore) { self.store = store }
    private func safeFile(root: URL, path: String) throws -> URL {
        let media = path.hasPrefix("media/")
        if media { try ContentPackage.validateMediaPath(path) }
        else {
            guard path.range(of: "^[A-Za-z0-9_-]+\\.json$", options: .regularExpression) != nil else { throw CoreError.unsafePath }
        }
        var file = root
        for component in path.split(separator: "/") {
            file.appendPathComponent(String(component))
            let values = try file.resourceValues(forKeys: [.isSymbolicLinkKey])
            guard values.isSymbolicLink != true else { throw CoreError.unsafePath }
        }
        guard try file.resourceValues(forKeys: [.isRegularFileKey]).isRegularFile == true else { throw CoreError.unsafePath }
        return file
    }
    public func install(directory root: URL) throws {
        let manifestURL = try safeFile(root: root, path: "manifest.json")
        let manifestSize = try manifestURL.resourceValues(forKeys: [.fileSizeKey]).fileSize ?? 0
        guard manifestSize <= 8 * 1024 * 1024 else { throw CoreError.tooLarge }
        let manifest = try JSONDecoder().decode(PackageManifest.self, from: Data(contentsOf: manifestURL))
        guard manifest.schemaVersion == 1 else { throw CoreError.unsupportedSchema }
        guard !manifest.files.isEmpty, manifest.files.count <= 60_000,
              Set(manifest.files.map(\.path)).count == manifest.files.count else { throw CoreError.invalidContent }
        var totalBytes: Int64 = 0
        for item in manifest.files {
            guard item.bytes >= 0, item.bytes <= ContentPackage.maximumBytes else { throw CoreError.tooLarge }
            totalBytes += Int64(item.bytes)
            guard totalBytes <= 4 * 1024 * 1024 * 1024 else { throw CoreError.tooLarge }
            if item.path.hasPrefix("media/") {
                guard item.path.split(separator: "/").last?.split(separator: ".").first?.lowercased() == item.sha256.lowercased() else { throw CoreError.integrityMismatch }
            }
        }
        let contents = manifest.files.filter { !$0.path.hasPrefix("media/") }
        guard contents.count == 1, contents[0].path != "manifest.json" else { throw CoreError.invalidContent }
        for item in manifest.files { try PackageIntegrity.check(safeFile(root: root, path: item.path), expected: item) }
        let contentURL = try safeFile(root: root, path: contents[0].path)
        let package = try ContentPackage.decode(Data(contentsOf: contentURL))
        guard package.packageId == manifest.packageId, package.version == manifest.version else { throw CoreError.integrityMismatch }
        let paths = Set(manifest.files.map(\.path))
        for note in package.notes {
            for path in [note.audio] + (note.examples ?? []).map(\.audio) {
                if let path, !paths.contains(path) { throw CoreError.integrityMismatch }
            }
        }
        let mediaDirectory = store.directory.appendingPathComponent("media")
        try FileManager.default.createDirectory(at: mediaDirectory, withIntermediateDirectories: true)
        for item in manifest.files where item.path.hasPrefix("media/") {
            let target = store.directory.appendingPathComponent(item.path)
            if FileManager.default.fileExists(atPath: target.path), (try? PackageIntegrity.check(target, expected: item)) != nil { continue }
            let temporary = mediaDirectory.appendingPathComponent(".\(UUID().uuidString)")
            defer { try? FileManager.default.removeItem(at: temporary) }
            try FileManager.default.copyItem(at: safeFile(root: root, path: item.path), to: temporary)
            try PackageIntegrity.check(temporary, expected: item)
            if FileManager.default.fileExists(atPath: target.path) {
                _ = try FileManager.default.replaceItemAt(target, withItemAt: temporary)
            } else { try FileManager.default.moveItem(at: temporary, to: target) }
        }
        try store.install(package)
    }
}
