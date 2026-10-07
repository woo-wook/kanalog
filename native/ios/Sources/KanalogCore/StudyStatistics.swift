import Foundation

/// Calendar windows include today and all saved answer types, including kana/reinforcement.
/// A repeated note ID counts once per period even when it has several answer records.
public struct StudyStatistics: Sendable {
    public let answers7Days: Int
    public let uniqueCards7Days: Int
    public let answers30Days: Int
    public let uniqueCards30Days: Int
    public let streak: Int
    public let lastStudiedAt: Date?
    public let todayReviews: [SavedReview]

    public init(reviews: [SavedReview], timezone: TimeZone, now: Date = Date()) {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = timezone
        let validReviews = reviews.filter { $0.receipt.reviewedAt <= now }
        let today = calendar.startOfDay(for: now)
        let end = calendar.date(byAdding: .day, value: 1, to: today)!
        let begin7 = calendar.date(byAdding: .day, value: -6, to: today)!
        let begin30 = calendar.date(byAdding: .day, value: -29, to: today)!
        let recent7 = validReviews.filter { $0.receipt.reviewedAt >= begin7 && $0.receipt.reviewedAt < end }
        let recent30 = validReviews.filter { $0.receipt.reviewedAt >= begin30 && $0.receipt.reviewedAt < end }
        answers7Days = recent7.count
        uniqueCards7Days = Set(recent7.map(\.request.noteID)).count
        answers30Days = recent30.count
        uniqueCards30Days = Set(recent30.map(\.request.noteID)).count
        todayReviews = validReviews.filter { $0.receipt.reviewedAt >= today && $0.receipt.reviewedAt < end }
        lastStudiedAt = validReviews.map(\.receipt.reviewedAt).max()
        let learnedDays = Set(validReviews.map { calendar.startOfDay(for: $0.receipt.reviewedAt) })
        var day = learnedDays.contains(today) ? today : calendar.date(byAdding: .day, value: -1, to: today)!
        var consecutive = 0
        while learnedDays.contains(day) {
            consecutive += 1
            day = calendar.date(byAdding: .day, value: -1, to: day)!
        }
        streak = consecutive
    }
}
