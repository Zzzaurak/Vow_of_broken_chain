package services.AdventureService.objects
import io.circe.{Encoder, Decoder}
import io.circe.generic.semiauto.*
final case class RegionDefinition(mapId: String, requires: List[String], exits: List[MapExit], points: List[ExplorationPoint])
object RegionDefinition:
  given Encoder[RegionDefinition] = deriveEncoder
  given Decoder[RegionDefinition] = deriveDecoder
