package services.PlayerService.routes
import services.system.routes.Endpoint
import services.PlayerService.objects.apiTypes.AnonymousPlayerResponse
import services.PlayerService.api.*
object PlayerRoutes:
  val apiMessages = List(Endpoint.noRequest[CreateAnonymousPlayerMessage, AnonymousPlayerResponse]("PlayerService", () => CreateAnonymousPlayerMessage()),
    Endpoint.register[RegisterAccountMessage,String]("PlayerService"),
    Endpoint.publicMessage[LoginMessage,String]("PlayerService"),
    Endpoint.register[GetAdministratorMessage,Boolean]("PlayerService"),
    Endpoint.register[LogoutMessage,Boolean]("PlayerService"))
