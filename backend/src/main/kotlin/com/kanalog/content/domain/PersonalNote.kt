package com.kanalog.content.domain

import com.kanalog.common.error.fail

/** Required content of an owner-authored vocabulary note. */
data class PersonalNote(val japanese: String, val reading: String, val meaning: String) {
    init { if(japanese.isEmpty() || reading.isEmpty() || meaning.isEmpty()) fail("BAD_NOTE", "표기·읽기·뜻을 입력하세요") }
    companion object {
        fun of(japanese: String, reading: String?, meaning: String?) = PersonalNote(japanese.trim(), reading?.trim().orEmpty(), meaning?.trim().orEmpty())
    }
}
