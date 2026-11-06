package services.PlayerService.utils
import cats.effect.IO
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.PBEKeySpec
import java.util.{Base64, Locale}
import java.security.{MessageDigest, SecureRandom}
import services.system.objects.ApiError

private[PlayerService] object Passwords:
  def name(input: String): String = input.trim.toLowerCase(Locale.ROOT)
  def validate(username: String, password: String): IO[Unit] =
    IO.raiseUnless(username.matches("[\\p{L}0-9_]{2,32}") && password.length >= 8 && password.length <= 128)(
      ApiError("invalid_credentials_format", "用户名须为 2–32 个字母、汉字、数字或下划线，密码须为 8–128 个字符。"))
  def salt: IO[String] = IO.blocking(Base64.getEncoder.encodeToString(new SecureRandom().generateSeed(16)))
  def derive(password: String, salt: String): IO[String] = IO.blocking {
    val spec = new PBEKeySpec(password.toCharArray, Base64.getDecoder.decode(salt), 600000, 256)
    Base64.getEncoder.encodeToString(SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).getEncoded)
  }
  def matches(actual: String, expected: String): Boolean =
    MessageDigest.isEqual(Base64.getDecoder.decode(actual), Base64.getDecoder.decode(expected))
