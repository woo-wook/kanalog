package com.kanalog.common.presentation

import com.kanalog.common.web.requestId

import com.kanalog.common.error.ApiFailure
import jakarta.servlet.http.HttpServletRequest
import java.util.*
import org.springframework.http.ResponseEntity
import org.springframework.http.converter.HttpMessageNotReadableException
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.bind.annotation.*
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException

@RestControllerAdvice
class Errors {
    @ExceptionHandler(ApiFailure::class)
    fun api(e: ApiFailure, request: HttpServletRequest) =
        ResponseEntity.status(e.status.value).body(mapOf("code" to e.code,"message" to e.message,"requestId" to request.requestId()))
    @ExceptionHandler(MethodArgumentNotValidException::class)
    fun validation(e: MethodArgumentNotValidException, request: HttpServletRequest) =
        ResponseEntity.badRequest().body(mapOf("code" to "INVALID_INPUT", "message" to "입력값을 확인하세요",
            "fieldErrors" to e.bindingResult.fieldErrors.associate { it.field to (it.defaultMessage ?: "올바르지 않습니다") },
            "requestId" to request.requestId()))
    @ExceptionHandler(HttpMessageNotReadableException::class, MethodArgumentTypeMismatchException::class)
    fun malformed(e: Exception, request: HttpServletRequest) =
        ResponseEntity.badRequest().body(mapOf("code" to "INVALID_INPUT", "message" to "요청 형식을 확인하세요",
            "requestId" to request.requestId()))
    @ExceptionHandler(Exception::class)
    fun unexpected(e: Exception, request: HttpServletRequest) =
        ResponseEntity.status(500).body(mapOf("code" to "INTERNAL_ERROR","message" to "요청을 처리하지 못했습니다","requestId" to request.requestId()))
}
