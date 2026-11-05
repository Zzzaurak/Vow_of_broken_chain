package services.AdventureService.routes
import services.system.routes.Endpoint
import services.AdventureService.api.*
import services.AdventureService.objects.apiTypes.*
object AdventureRoutes:
  val apiMessages = List(
    Endpoint.register[ListSavesMessage,SaveListResponse]("AdventureService"),
    Endpoint.register[StartAdventureMessage,ProgressResponse]("AdventureService"),
    Endpoint.register[LoadAdventureMessage,ProgressResponse]("AdventureService"),
    Endpoint.register[SaveProgressMessage,ProgressResponse]("AdventureService")
  )
