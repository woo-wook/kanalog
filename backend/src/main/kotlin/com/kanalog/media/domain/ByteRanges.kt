package com.kanalog.media.domain

object ByteRanges {
    fun parse(value:String,length:Long):Pair<Long,Long>? {
        val match=Regex("^bytes=(\\d*)-(\\d*)$").matchEntire(value) ?: return null
        val left=match.groupValues[1]; val right=match.groupValues[2]
        if(left.isEmpty() && right.isEmpty()) return null
        return try {
            val start=if(left.isEmpty()) maxOf(0,length-right.toLong()) else left.toLong()
            val end=if(left.isEmpty()) length-1 else if(right.isEmpty()) length-1 else minOf(length-1,right.toLong())
            if(start<0 || start>=length || end<start) null else start to end
        } catch (_:NumberFormatException) { null }
    }
}
