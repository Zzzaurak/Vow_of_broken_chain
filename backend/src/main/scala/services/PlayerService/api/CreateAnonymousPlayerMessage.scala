package services.PlayerService.api
import cats.effect.IO
import services.PlayerService.objects.apiTypes.AnonymousPlayerResponse
import java.sql.Connection
import java.util.UUID
import services.system.api.NoRequestMessage
import services.PlayerService.objects.PlayerId
import services.PlayerService.tables.Player.PlayerTable
import services.PlayerService.tables.PlayerSession.PlayerSessionTable
import services.PlayerService.utils.Tokens
final case class CreateAnonymousPlayerMessage() extends NoRequestMessage[AnonymousPlayerResponse]:
  def plan(c: Connection): IO[AnonymousPlayerResponse] = for
    id <- IO.delay(PlayerId(UUID.randomUUID().toString))
    token <- Tokens.generate
    _ <- PlayerTable.insert(c,id)
    _ <- PlayerSessionTable.insert(c,Tokens.hash(token),id)
  yield AnonymousPlayerResponse(token,0)
