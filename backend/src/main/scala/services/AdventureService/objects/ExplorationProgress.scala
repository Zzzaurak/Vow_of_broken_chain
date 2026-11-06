package services.AdventureService.objects
import io.circe.{Encoder, Decoder}
import io.circe.generic.semiauto.*
final case class ExplorationProgress(visited: List[String], flags: List[String], collected: List[String])
object ExplorationProgress:
  given Encoder[ExplorationProgress] = deriveEncoder
  given Decoder[ExplorationProgress] = deriveDecoder
