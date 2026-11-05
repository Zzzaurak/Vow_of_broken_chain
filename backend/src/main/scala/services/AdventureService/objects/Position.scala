package services.AdventureService.objects
import io.circe.{Encoder, Decoder}
import io.circe.generic.semiauto.*
final case class Position(x: Double, y: Double)
object Position:
  given Encoder[Position] = deriveEncoder
  given Decoder[Position] = deriveDecoder
