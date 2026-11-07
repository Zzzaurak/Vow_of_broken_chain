package services.PlayerService.api
import cats.effect.IO
import java.sql.Connection
import io.circe.{Decoder,Encoder}
import io.circe.generic.semiauto.*
import services.system.api.APIMessage
import services.PlayerService.objects.PlayerId
import services.PlayerService.tables.Account.AccountTable
final case class GetAdministratorMessage(playerId: PlayerId) extends APIMessage[Boolean]:
  def plan(c: Connection): IO[Boolean] = AccountTable.isAdministrator(c, playerId)
object GetAdministratorMessage:
  given Decoder[GetAdministratorMessage] = deriveDecoder
  given Encoder[GetAdministratorMessage] = deriveEncoder
