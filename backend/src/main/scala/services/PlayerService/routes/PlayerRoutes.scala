package services.PlayerService.routes
import services.system.routes.Endpoint
import services.PlayerService.objects.apiTypes.AnonymousPlayerResponse
import services.PlayerService.api.CreateAnonymousPlayerMessage
object PlayerRoutes:
  val apiMessages = List(Endpoint.noRequest[CreateAnonymousPlayerMessage, AnonymousPlayerResponse]("PlayerService", () => CreateAnonymousPlayerMessage()))
