package com.kanalog.content.application.model

import org.springframework.web.bind.annotation.*

data class NotePatch(val japanese: String? = null, val reading: String? = null, val meaning: String? = null,
    val example: String? = null, val exampleMeaning: String? = null, val memo: String? = null,
    val hangulHint: String? = null, val bookmarked: Boolean? = null, val excluded: Boolean? = null)
