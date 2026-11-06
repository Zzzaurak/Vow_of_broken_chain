package services.PlayerService.api
import cats.effect.IO
import java.sql.Connection
import io.circe.{Decoder,Encoder}
import io.circe.generic.semiauto.*
import services.system.api.APIMessage
import services.system.objects.ApiError
import services.PlayerService.tables.Account.AccountTable
import services.PlayerService.utils.Passwords
import services.PlayerService.tables.PlayerSession.PlayerSessionTable
import services.PlayerService.utils.Tokens
final case class LoginMessage(username: String, password: String) extends APIMessage[String]:
  def plan(c: Connection): IO[String] = for
    name <- IO.pure(Passwords.name(username))
    _ <- Passwords.validate(name, password)
    entry <- AccountTable.credentials(c, name)
    hash <- Passwords.derive(password, entry.fold("AAAAAAAAAAAAAAAAAAAAAA==")(_._2))
    id <- IO.fromOption(entry.collect { case (id, _, expected) if Passwords.matches(hash, expected) => id })(
      ApiError("login_failed","用户名或密码错误。",401))
    token <- Tokens.generate
    _ <- PlayerSessionTable.insert(c, Tokens.hash(token), id)
  yield token
object LoginMessage:
  given Decoder[LoginMessage] = deriveDecoder
  given Encoder[LoginMessage] = deriveEncoder
