package com.kanalog.study.domain

import com.kanalog.common.error.fail

data class KanaMixRequest(
    val scripts:List<String> = listOf("hiragana"),
    val groups:List<String> = listOf("basic"),
    // Accepted for previously saved clients; kana always uses the full range.
    val size:Int = 10,
    val practice:Boolean = false
) {
    fun validate() {
        if(scripts.isEmpty() || scripts.size>2 || scripts.distinct().size!=scripts.size ||
            scripts.any { it !in setOf("hiragana","katakana") } ||
            groups.isEmpty() || groups.size>4 || groups.distinct().size!=groups.size ||
            groups.any { it !in setOf("basic","voiced","semiVoiced","yoon") })
            fail("BAD_KANA_SCOPE","문자 종류·연습 범위를 확인하세요")
    }
    fun title():String = "${if(scripts.size==2) "가나" else if(scripts.first()=="hiragana") "히라가나" else "가타카나"} ${if(practice) "자유 연습" else "섞어 학습"}"
}
