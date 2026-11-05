package services.system.routes
import cats.effect.IO
import java.sql.Connection
import io.circe.{Json, Decoder, Encoder}
import io.circe.syntax.*
import scala.compiletime.constValue
import scala.deriving.Mirror
import services.system.api.APIMessage
import services.PlayerService.objects.PlayerId
import services.system.objects.ApiError
final case class Endpoint(service: String, action: String, authenticated: Boolean, run: (Json,Connection,Option[PlayerId]) => IO[Json])
object Endpoint:
  inline def register[M <: APIMessage[A], A: Encoder](service: String)(using decoder: Decoder[M], mirror: Mirror.Of[M]): Endpoint =
    val action = constValue[mirror.MirroredLabel].asInstanceOf[String].stripSuffix("Message").toLowerCase
    Endpoint(service,action,true,(json,c,player) => for
      id <- IO.fromOption(player)(ApiError("invalid_token","需要匿名身份",401))
      message <- IO.fromEither(decoder.decodeJson(json.deepMerge(Json.obj("playerId" -> id.asJson))).left.map(_ => ApiError("invalid_request","请求字段不合法")))
      result <- message.plan(c)
    yield result.asJson)
