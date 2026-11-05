package services.AdventureService.utils
import cats.effect.IO
import io.circe.{Encoder,Decoder}
import io.circe.syntax.*
import java.sql.Connection
import services.PlayerService.objects.PlayerId
import services.PlayerService.tables.Player.PlayerTable
import services.AdventureService.tables.ProgressOperation.ProgressOperationTable
import services.system.objects.ApiError
object Operations:
  private[AdventureService] def once[A: Encoder: Decoder](c: Connection, player: PlayerId, operation: String, expected: Long, request: String)(action: IO[A]): IO[A] =
    for
      _ <- IO.raiseWhen(operation.isEmpty || operation.length > 100)(ApiError("invalid_operation","操作标识无效"))
      owner <- PlayerTable.lock(c,player).flatMap(IO.fromOption(_)(ApiError("invalid_token","玩家不存在",401)))
      prior <- ProgressOperationTable.find(c,player,operation)
      result <- prior match
        case Some((original,response)) =>
          IO.raiseUnless(original == request)(ApiError("operation_reused","操作标识已用于不同请求",409)) *> IO.fromEither(response.as[A])
        case None =>
          for
            _ <- IO.raiseUnless(owner.revision == expected)(ApiError("revision_conflict","进度已在另一次操作中改变，请重新读取存档。",409))
            response <- action
            _ <- ProgressOperationTable.insert(c,player,operation,request,response.asJson)
          yield response
    yield result
