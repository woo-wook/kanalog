package com.kanalog.study.application.model

import java.time.*
import java.util.*

data class QueueInfo(val eligibleCards:Int, val unseenCards:Int, val newRemaining:Int, val nextDueAt:Instant?, val reason:String?)
