import Foundation

public enum PronunciationError: Error, LocalizedError, Equatable, Sendable {
    case japaneseVoiceUnavailable
    case emptyText
    public var errorDescription: String? {
        switch self {
        case .japaneseVoiceUnavailable:
            return "일본어 기기 음성이 없습니다. iOS 설정 → 손쉬운 사용 → 읽기 및 말하기(이전 버전은 콘텐츠 말하기) → 음성에서 일본어 음성을 내려받은 뒤 다시 시도해 주세요."
        case .emptyText:
            return "읽을 일본어 텍스트가 없습니다."
        }
    }
}
