package com.kanalog.account.domain

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID

@Entity
@Table(name="app_user")
class AppUserEntity(
    @Id @GeneratedValue(strategy=GenerationType.UUID) var id:UUID? = null,
    @Column(nullable=false,unique=true,length=320) var email:String = "",
    @Column(name="password_hash",nullable=false,length=100) var passwordHash:String = "",
    @Column(nullable=false,length=80) var timezone:String = "Asia/Seoul",
    @Column(name="created_at",nullable=false) var createdAt:Instant = Instant.now()
)
