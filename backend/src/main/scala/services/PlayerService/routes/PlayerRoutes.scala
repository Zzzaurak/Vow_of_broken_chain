package services.PlayerService.routes
import services.system.routes.Endpoint
import io.circe.syntax.*
import services.PlayerService.api.CreateAnonymousPlayerMessage
object PlayerRoutes:
  val apiMessages = List(Endpoint("PlayerService","createanonymousplayer",false,(_,c,_) => CreateAnonymousPlayerMessage().plan(c).map(_.asJson)))
