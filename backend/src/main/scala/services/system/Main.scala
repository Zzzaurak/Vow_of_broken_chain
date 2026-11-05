package services.system
import cats.effect.{IO,IOApp}
import cats.syntax.all.*
import org.http4s.{HttpRoutes,Response,Status}
import org.http4s.dsl.io.*
import org.http4s.circe.*
import org.http4s.ember.server.EmberServerBuilder
import com.comcast.ip4s.*
import io.circe.Json
import services.system.database.Database
import services.system.objects.ApiError
import services.PlayerService.api.ResolvePlayerMessage
import services.PlayerService.routes.PlayerRoutes
import services.AdventureService.routes.AdventureRoutes
import services.PlayerService.tables.Player.PlayerTableInitializer
import services.PlayerService.tables.PlayerSession.PlayerSessionTableInitializer
import services.AdventureService.tables.Adventure.AdventureTableInitializer
import services.AdventureService.tables.GameSave.GameSaveTableInitializer
import services.AdventureService.tables.ProgressOperation.ProgressOperationTableInitializer
object Main extends IOApp.Simple:
  private val endpoints = PlayerRoutes.apiMessages ++ AdventureRoutes.apiMessages
  private val routes = HttpRoutes.of[IO] {
    case GET -> Root / "health" => Ok(Json.obj("status" -> Json.fromString("ok")))
    case request @ POST -> Root / "api" / service / action =>
      val result = for
        endpoint <- IO.fromOption(endpoints.find(e => e.service == service && e.action == action))(ApiError("not_found","接口不存在",404))
        body <- request.as[Json].handleErrorWith(_ => IO.raiseError(ApiError("invalid_json","请求不是有效 JSON")))
        response <- Database.connection.use(c => Database.transaction(c) {
          for
            player <- if endpoint.authenticated then ResolvePlayerMessage(request.headers.headers.find(_.name.toString.equalsIgnoreCase("Authorization")).map(_.value.stripPrefix("Bearer ")).getOrElse("")).plan(c).map(Some(_)) else IO.pure(None)
            value <- endpoint.run(body,c,player)
          yield value
        })
        reply <- Ok(response)
      yield reply
      result.handleErrorWith {
        case error: ApiError => IO.pure(Response[IO](Status.fromInt(error.status).getOrElse(Status.BadRequest)).withEntity(Json.obj("code" -> Json.fromString(error.code),"message" -> Json.fromString(error.detail))))
        case error => IO.println(s"Request failed: ${error.getClass.getSimpleName}") *> InternalServerError(Json.obj("code" -> Json.fromString("server_error"),"message" -> Json.fromString("服务器未完成请求，请保留当前进度并重试。")))
      }
  }
  def run: IO[Unit] = for
    _ <- Database.connection.use(c => Database.transaction(c)(List(PlayerTableInitializer.initialize(c),PlayerSessionTableInitializer.initialize(c),AdventureTableInitializer.initialize(c),GameSaveTableInitializer.initialize(c),ProgressOperationTableInitializer.initialize(c)).sequence_))
    _ <- EmberServerBuilder.default[IO].withHost(host"127.0.0.1").withPort(Port.fromString(sys.env.getOrElse("PORT","8093")).getOrElse(port"8093")).withHttpApp(routes.orNotFound).build.use(_ => IO.println("Oath API listening on 127.0.0.1:8093") *> IO.never)
  yield ()
