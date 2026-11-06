package services.PlayerService.api
import cats.effect.IO
import java.sql.Connection
import io.circe.{Decoder,Encoder}
import io.circe.generic.semiauto.*
import services.system.api.APIMessage
import services.PlayerService.objects.PlayerId
import services.PlayerService.tables.PlayerSession.PlayerSessionTable
import services.PlayerService.utils.Tokens

final case class LogoutMessage(playerId: PlayerId, token: String) extends APIMessage[Boolean]:
  def plan(c: Connection): IO[Boolean] = PlayerSessionTable.revoke(c, playerId, Tokens.hash(token))
object LogoutMessage:
  given Decoder[LogoutMessage] = deriveDecoder
  given Encoder[LogoutMessage] = deriveEncoder
