import Foundation
import CryptoKit
import Testing
@testable import KanalogCore

func hash(_ data: Data) -> String { SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined() }

@Test func manifestIntegrityFailureKeepsExistingContentAndProgress() throws {
    let directory = try temporaryDirectory()
    let input = try temporaryDirectory()
    defer { try? FileManager.default.removeItem(at: directory); try? FileManager.default.removeItem(at: input) }
    let store = try LocalStudyStore(directory: directory)
    try store.install(ContentPackage(packageId: "synthetic", version: "1", notes: fixtureNotes(1)))
    let incoming = ContentPackage(packageId: "synthetic", version: "2", notes: fixtureNotes(2))
    let data = try JSONEncoder().encode(incoming)
    try data.write(to: input.appendingPathComponent("content.json"))
    let manifest = PackageManifest(schemaVersion: 1, packageId: "synthetic", version: "2", files: [ManifestFile(path: "content.json", sha256: String(repeating: "0", count: 64), bytes: data.count)])
    try JSONEncoder().encode(manifest).write(to: input.appendingPathComponent("manifest.json"))
    let before = try store.snapshot()
    #expect(throws: CoreError.integrityMismatch) { try ContentPackageInstaller(store: store).install(directory: input) }
    #expect(try store.snapshot() == before)
}

@Test func oversizedManifestIntegerAndSymlinkAreRejected() throws {
    let directory = try temporaryDirectory(), input = try temporaryDirectory(), outside = try temporaryDirectory()
    defer { for url in [directory, input, outside] { try? FileManager.default.removeItem(at: url) } }
    let store = try LocalStudyStore(directory: directory)
    let digest = String(repeating: "0", count: 64)
    let large = PackageManifest(packageId: "synthetic", version: "1", files: [ManifestFile(path: "content.json", sha256: digest, bytes: Int.max), ManifestFile(path: "other.json", sha256: digest, bytes: Int.max)])
    try JSONEncoder().encode(large).write(to: input.appendingPathComponent("manifest.json"))
    #expect(throws: CoreError.tooLarge) { try ContentPackageInstaller(store: store).install(directory: input) }
    let data = try JSONEncoder().encode(ContentPackage(packageId: "synthetic", version: "1", notes: fixtureNotes(1)))
    let target = outside.appendingPathComponent("outside.json")
    try data.write(to: target)
    try FileManager.default.createSymbolicLink(at: input.appendingPathComponent("content.json"), withDestinationURL: target)
    let linked = PackageManifest(packageId: "synthetic", version: "1", files: [ManifestFile(path: "content.json", sha256: hash(data), bytes: data.count)])
    try JSONEncoder().encode(linked).write(to: input.appendingPathComponent("manifest.json"))
    #expect(throws: CoreError.unsafePath) { try ContentPackageInstaller(store: store).install(directory: input) }
    #expect(try store.snapshot().notes.isEmpty)
}
