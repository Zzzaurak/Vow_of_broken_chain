package services.AdventureService.objects
import io.circe.{Encoder, Decoder}
import io.circe.generic.semiauto.*
final case class MapExit(id: String, to: String, side: MapSide, at: Double, arrival: List[Double], requires: List[String], travel: Option[TravelKind])
object MapExit:
  given Encoder[MapExit] = deriveEncoder
  given Decoder[MapExit] = deriveDecoder
