import Foundation

public struct DownloadDescriptor: Sendable {
    public var url: URL
    public var sha256: String
    public var bytes: Int
    public init(url: URL, sha256: String, bytes: Int) { self.url = url; self.sha256 = sha256; self.bytes = bytes }
}
private final class HTTPSRedirectGuard: NSObject, URLSessionTaskDelegate, @unchecked Sendable {
    func urlSession(_ session: URLSession, task: URLSessionTask, willPerformHTTPRedirection response: HTTPURLResponse, newRequest request: URLRequest, completionHandler: @escaping @Sendable (URLRequest?) -> Void) {
        completionHandler(request.url?.scheme?.lowercased() == "https" ? request : nil)
    }
}
/// Optional catalog transport. Learning, settings and local installation have no dependency on it.
/// Catalog clients download each manifest entry, then hand a completed temporary directory to the installer.
public struct DownloadTransport: Sendable {
    public init() {}
    public func download(_ descriptor: DownloadDescriptor, to destination: URL) async throws {
        guard descriptor.url.scheme?.lowercased() == "https", descriptor.url.host != nil,
              descriptor.bytes >= 0, descriptor.bytes <= ContentPackage.maximumBytes else { throw CoreError.unsafePath }
        let configuration = URLSessionConfiguration.ephemeral
        configuration.timeoutIntervalForRequest = 60; configuration.timeoutIntervalForResource = 180
        let guardDelegate = HTTPSRedirectGuard()
        let session = URLSession(configuration: configuration, delegate: guardDelegate, delegateQueue: nil)
        defer { session.invalidateAndCancel() }
        var request = URLRequest(url: descriptor.url); request.cachePolicy = .reloadIgnoringLocalCacheData
        let (bytes, response) = try await session.bytes(for: request)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode),
              response.url?.scheme?.lowercased() == "https",
              response.expectedContentLength < 0 || response.expectedContentLength == Int64(descriptor.bytes) else { throw CoreError.integrityMismatch }
        let temporary = destination.deletingLastPathComponent().appendingPathComponent(".download-\(UUID().uuidString)")
        FileManager.default.createFile(atPath: temporary.path, contents: nil)
        defer { try? FileManager.default.removeItem(at: temporary) }
        let handle = try FileHandle(forWritingTo: temporary)
        do {
            var buffer = Data(); var count = 0
            for try await byte in bytes {
                count += 1
                guard count <= descriptor.bytes else { throw CoreError.tooLarge }
                buffer.append(byte)
                if buffer.count >= 64 * 1024 { try handle.write(contentsOf: buffer); buffer.removeAll(keepingCapacity: true) }
            }
            if !buffer.isEmpty { try handle.write(contentsOf: buffer) }
            try handle.close()
        } catch { try? handle.close(); throw error }
        try PackageIntegrity.check(temporary, expected: ManifestFile(path: "download", sha256: descriptor.sha256, bytes: descriptor.bytes))
        if FileManager.default.fileExists(atPath: destination.path) {
            _ = try FileManager.default.replaceItemAt(destination, withItemAt: temporary)
        } else { try FileManager.default.moveItem(at: temporary, to: destination) }
    }
}
