package services.PlayerService.api
import cats.effect.IO
import java.sql.Connection
import io.circe.{Decoder,Encoder}
import io.circe.generic.semiauto.*
import services.system.api.APIMessage
import services.system.objects.ApiError
import services.PlayerService.objects.PlayerId
import services.PlayerService.tables.Account.AccountTable
import services.PlayerService.utils.Passwords

final case class RegisterAccountMessage(playerId: PlayerId, username: String, password: String) extends APIMessage[String]:
  def plan(c: Connection): IO[String] = for
    name <- IO.pure(Passwords.name(username))
    _ <- Passwords.validate(name, password)
    salt <- Passwords.salt
    verifier <- Passwords.derive(password, salt)
    inserted <- AccountTable.insert(c, playerId, name, salt, verifier)
    _ <- IO.raiseUnless(inserted)(ApiError("account_exists", "用户名已被使用，或当前玩家已经注册。",409))
  yield name
object RegisterAccountMessage:
  given Decoder[RegisterAccountMessage] = deriveDecoder
  given Encoder[RegisterAccountMessage] = deriveEncoder
