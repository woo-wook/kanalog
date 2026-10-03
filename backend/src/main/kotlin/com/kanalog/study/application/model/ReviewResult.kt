package com.kanalog.study.application.model

import java.time.*
import java.util.*

data class ReviewResult(val due: Instant?, val version: Long, val state: String)
