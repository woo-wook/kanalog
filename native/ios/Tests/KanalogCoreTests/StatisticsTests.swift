import Foundation
import Testing
@testable import KanalogCore

private func instant(_ value: String) throws -> Date { try #require(ISO8601DateFormatter().date(from: value)) }
private func savedAnswer(_ id: String, _ at: Date, kind: ContentKind = .vocabulary, reinforcement: Bool = false) -> SavedReview {
    let request = ReviewRequest(key: UUID().uuidString, sessionID: "synthetic-session", itemID: UUID().uuidString, noteID: id, expectedVersion: 0, rating: .good)
    return SavedReview(request: request, receipt: ReviewReceipt(noteID: id, version: 1, card: nil, reviewedAt: at, reinforcement: reinforcement), officialLog: nil, wasNew: false, kind: kind)
}

@Test func statisticsUsesLocalMidnightForSevenAndThirtyInclusiveDaysAndDistinctNoteIDs() throws {
    let now = try instant("2026-10-07T00:00:00+09:00")
    let reviews = [
        savedAnswer("kana", try instant("2026-09-30T23:59:59+09:00"), kind: .hiragana),
        savedAnswer("word", try instant("2026-10-01T00:00:00+09:00")),
        savedAnswer("word", try instant("2026-10-06T23:59:59+09:00"), reinforcement: true),
        savedAnswer("grammar", now, kind: .grammar),
        savedAnswer("old", try instant("2026-09-08T00:00:00+09:00")),
        savedAnswer("too-old", try instant("2026-09-07T23:59:59+09:00")),
    ]
    let seoul = StudyStatistics(reviews: reviews, timezone: try #require(TimeZone(identifier: "Asia/Seoul")), now: now)
    #expect(seoul.answers7Days == 3)
    #expect(seoul.uniqueCards7Days == 2)
    #expect(seoul.answers30Days == 5)
    #expect(seoul.uniqueCards30Days == 4)
    #expect(seoul.todayReviews.count == 1)
    #expect(seoul.lastStudiedAt == now)
    let utc = StudyStatistics(reviews: reviews, timezone: try #require(TimeZone(identifier: "UTC")), now: now)
    #expect(utc.answers7Days == 4)
    #expect(utc.todayReviews.count == 2)
}

@Test func streakStartsYesterdayWhenTodayHasNoAnswersAndStopsAtMissingDay() throws {
    let now = try instant("2026-10-07T12:00:00+09:00")
    let zone = try #require(TimeZone(identifier: "Asia/Seoul"))
    let yesterday = savedAnswer("a", try instant("2026-10-06T23:59:59+09:00"), kind: .hiragana)
    let earlier = savedAnswer("b", try instant("2026-10-05T09:00:00+09:00"), reinforcement: true)
    let third = savedAnswer("b", try instant("2026-10-04T11:00:00+09:00"))
    let old = savedAnswer("c", try instant("2026-10-02T11:00:00+09:00"))
    let noToday = StudyStatistics(reviews: [yesterday, earlier, third, old], timezone: zone, now: now)
    #expect(noToday.streak == 3)
    #expect(noToday.todayReviews.isEmpty)
    #expect(noToday.lastStudiedAt == yesterday.receipt.reviewedAt)
    #expect(StudyStatistics(reviews: [savedAnswer("today", now), yesterday, earlier, third, old], timezone: zone, now: now).streak == 4)
    #expect(StudyStatistics(reviews: [savedAnswer("today", now), earlier], timezone: zone, now: now).streak == 1)
    #expect(StudyStatistics(reviews: [earlier], timezone: zone, now: now).streak == 0)
    let empty = StudyStatistics(reviews: [], timezone: zone, now: now)
    #expect(empty.streak == 0)
    #expect(empty.lastStudiedAt == nil)
}

@Test func streakCollapsesAnswersBySelectedTimezoneInsteadOfElapsedHours() throws {
    let now = try instant("2026-10-07T00:00:00+09:00")
    let reviews = [savedAnswer("a", try instant("2026-10-06T00:00:00+09:00")), savedAnswer("a", try instant("2026-10-06T23:59:59+09:00"))]
    #expect(StudyStatistics(reviews: reviews, timezone: try #require(TimeZone(identifier: "Asia/Seoul")), now: now).streak == 1)
    #expect(StudyStatistics(reviews: reviews, timezone: try #require(TimeZone(identifier: "UTC")), now: now).streak == 2)
}

@Test func statisticsTreatsDaylightSavingRepeatedHourAsOneStudyDay() throws {
    let now = try instant("2026-11-02T00:00:00-05:00")
    let reviews = [
        savedAnswer("a", try instant("2026-11-01T01:30:00-04:00")),
        savedAnswer("a", try instant("2026-11-01T01:30:00-05:00"), reinforcement: true),
        savedAnswer("b", try instant("2026-10-31T23:59:59-04:00"), kind: .katakana),
    ]
    let summary = StudyStatistics(reviews: reviews, timezone: try #require(TimeZone(identifier: "America/New_York")), now: now)
    #expect(summary.streak == 2)
    #expect(summary.answers7Days == 3)
    #expect(summary.uniqueCards7Days == 2)
    #expect(summary.todayReviews.isEmpty)
    #expect(summary.lastStudiedAt == reviews[1].receipt.reviewedAt)
}

@Test func statisticsIgnoresFutureClockRecordsIncludingLaterToday() throws {
    let now = try instant("2026-10-07T09:00:00+09:00")
    let zone = try #require(TimeZone(identifier: "Asia/Seoul"))
    let yesterday = savedAnswer("past", try instant("2026-10-06T23:59:59+09:00"))
    let future = [savedAnswer("later-today", now.addingTimeInterval(1), kind: .hiragana), savedAnswer("tomorrow", try instant("2026-10-08T00:00:00+09:00"), reinforcement: true)]
    let summary = StudyStatistics(reviews: [yesterday] + future, timezone: zone, now: now)
    #expect(summary.answers7Days == 1)
    #expect(summary.uniqueCards7Days == 1)
    #expect(summary.answers30Days == 1)
    #expect(summary.uniqueCards30Days == 1)
    #expect(summary.todayReviews.isEmpty)
    #expect(summary.streak == 1)
    #expect(summary.lastStudiedAt == yesterday.receipt.reviewedAt)
    let futureOnly = StudyStatistics(reviews: future, timezone: zone, now: now)
    #expect(futureOnly.answers7Days == 0)
    #expect(futureOnly.streak == 0)
    #expect(futureOnly.lastStudiedAt == nil)
}
