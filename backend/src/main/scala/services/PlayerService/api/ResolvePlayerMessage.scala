package services.PlayerService.api
import cats.effect.IO
import java.sql.Connection
import services.system.api.APIMessage
import services.system.objects.ApiError
import services.PlayerService.objects.PlayerId
import services.PlayerService.tables.PlayerSession.PlayerSessionTable
import services.PlayerService.utils.Tokens
final case class ResolvePlayerMessage(token: String) extends APIMessage[PlayerId]:
  def plan(c: Connection): IO[PlayerId] = PlayerSessionTable.resolve(c,Tokens.hash(token)).flatMap(IO.fromOption(_)(ApiError("invalid_token","匿名身份已失效，请恢复原浏览器令牌或明确创建新身份。",401)))
