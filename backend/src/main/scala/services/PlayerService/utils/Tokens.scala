package services.PlayerService.utils
import cats.effect.IO
import java.security.{MessageDigest, SecureRandom}
import java.util.Base64
object Tokens:
  private[PlayerService] def generate: IO[String] = IO.blocking {
    val bytes = new SecureRandom().generateSeed(32)
    Base64.getUrlEncoder.withoutPadding.encodeToString(bytes)
  }
  private[PlayerService] def hash(token: String): String = MessageDigest.getInstance("SHA-256").digest(token.getBytes(java.nio.charset.StandardCharsets.UTF_8)).map(b => f"${b & 0xff}%02x").mkString
