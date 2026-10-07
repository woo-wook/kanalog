import Foundation
import Testing
@testable import KanalogCore

@Test func missingJapaneseVoiceExplainsHowToInstallDeviceVoice() {
    let message = PronunciationError.japaneseVoiceUnavailable.localizedDescription
    #expect(message.contains("일본어"))
    #expect(message.contains("손쉬운 사용"))
    #expect(message.contains("음성"))
    #expect(message.contains("내려받"))
    #expect(PronunciationError.emptyText.localizedDescription != message)
}
