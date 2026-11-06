package services.AdventureService.objects
import io.circe.{Encoder, Decoder}
import io.circe.generic.semiauto.*
final case class ExplorationPoint(id: String, kind: ExplorationPointKind, name: String, position: List[Double], text: String, requires: List[String], reward: Option[ExplorationReward], scene: Option[String], warp: Option[List[Double]], blocker: Option[List[Double]])
object ExplorationPoint:
  given Encoder[ExplorationPoint] = deriveEncoder
  given Decoder[ExplorationPoint] = deriveDecoder
