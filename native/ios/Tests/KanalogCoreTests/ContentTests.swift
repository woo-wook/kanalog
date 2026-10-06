import Foundation
import Testing
@testable import KanalogCore

@Test func refusesUnknownSchemaAndTraversalBeforeInstall() throws {
    let unknown = Data(#"{"schemaVersion":2,"packageId":"sample","version":"1","notes":[]}"#.utf8)
    #expect(throws: (any Error).self) { try ContentPackage.decode(unknown) }
    let traversal = Data(#"{"schemaVersion":1,"packageId":"sample","version":"1","notes":[{"id":"sample:1:front","kind":"vocabulary","front":"猫","audio":"media/../secret.mp3"}]}"#.utf8)
    #expect(throws: (any Error).self) { try ContentPackage.decode(traversal) }
}
