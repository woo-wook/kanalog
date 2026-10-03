package com.kanalog.imports.presentation.cli

import com.kanalog.account.application.AccountAdminService
import com.kanalog.auth.application.port.out.PasswordHasher
import com.kanalog.imports.application.ImportJobService
import com.kanalog.imports.application.MaxImportService
import java.nio.file.Path
import java.util.Locale
import org.springframework.beans.factory.annotation.Value
import org.springframework.boot.ApplicationArguments
import org.springframework.boot.ApplicationRunner
import org.springframework.stereotype.Component

@Component
class AdminCli(private val jobs:ImportJobService,private val passwords:PasswordHasher,private val importer:MaxImportService,
    private val accounts:AccountAdminService,
    @Value("\${app.cli:}") private val command:String,@Value("\${app.email:}") private val email:String,
    @Value("\${app.input-dir:}") private val inputDir:String):ApplicationRunner {
    override fun run(args:ApplicationArguments) {
        if(command.isBlank()) return
        val normalized=email.trim().lowercase(Locale.ROOT)
        if(normalized.isBlank()) error("--app.email is required")
        when(command) {
            "create-user","reset-password" -> {
                val password = System.console()?.readPassword("Password: ")?.concatToString()
                    ?: System.`in`.bufferedReader().readLine()
                    ?: error("Password must be provided through a terminal or stdin")
                if(password.length<12) error("Password must be at least 12 characters")
                val hash=passwords.encode(password)
                if(command=="create-user") {
                    val created=accounts.create(normalized,hash)
                    println(if(created) "Created account $normalized" else "Account already exists; unchanged: $normalized")
                } else {
                    accounts.reset(normalized,hash)
                    println("Reset password and revoked sessions for $normalized")
                }
            }
            "refresh-grammar-focus" -> {
                if(inputDir.isBlank()) error("--app.input-dir is required")
                val owner=accounts.idByEmail(normalized) ?: error("Account does not exist")
                val updated=importer.refreshGrammarFocus(owner,Path.of(inputDir).toAbsolutePath().normalize())
                println("Updated original grammar highlights for $updated notes")
            }
            "import-max" -> {
                if(inputDir.isBlank()) error("--app.input-dir is required")
                val owner=accounts.idByEmail(normalized) ?: error("Account does not exist")
                val dir=Path.of(inputDir).toAbsolutePath().normalize()
                val job=jobs.start(owner,dir.fileName.toString())
                try {
                    val result=importer.importData(owner,dir)
                    jobs.succeed(owner,job,result)
                    println("Imported ${result.cards} cards and ${result.media} media for $normalized; job=$job")
                } catch(e:Exception) {
                    jobs.failed(owner,job,e)
                    throw e
                }
            }
            else -> error("Unknown --app.cli command")
        }
    }
}
