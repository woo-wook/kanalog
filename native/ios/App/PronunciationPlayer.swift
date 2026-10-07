import AVFoundation
import KanalogCore

@MainActor
final class PronunciationPlayer: NSObject, AVAudioPlayerDelegate {
    private var player: AVAudioPlayer?
    private let synthesizer = AVSpeechSynthesizer()
    func stop() { player?.stop(); player = nil; synthesizer.stopSpeaking(at: .immediate) }
    func play(path: String?, text: String, directory: URL, rate: Float) throws {
        stop()
        try AVAudioSession.sharedInstance().setCategory(.playback, mode: .spokenAudio)
        try AVAudioSession.sharedInstance().setActive(true)
        if let path {
            try ContentPackage.validateMediaPath(path)
            let url = directory.appendingPathComponent(path)
            if FileManager.default.fileExists(atPath: url.path) {
                do {
                    let audio = try AVAudioPlayer(contentsOf: url)
                    audio.delegate = self; audio.prepareToPlay()
                    if audio.play() { player = audio; return }
                } catch { /* Unsupported local formats use the installed device voice below. */ }
            }
        }
        guard !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { throw PronunciationError.emptyText }
        guard let voice = AVSpeechSynthesisVoice(language: "ja-JP") else { throw PronunciationError.japaneseVoiceUnavailable }
        let utterance = AVSpeechUtterance(string: text)
        utterance.voice = voice; utterance.rate = rate
        synthesizer.speak(utterance)
    }
}
