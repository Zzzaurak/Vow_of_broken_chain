package services.AdventureService.objects
import io.circe.{Encoder, Decoder}
enum TravelKind:
  case voyage
object TravelKind:
  given Encoder[TravelKind] = Encoder.encodeString.contramap(_.toString)
  given Decoder[TravelKind] = Decoder.decodeString.emap(value => values.find(_.toString == value).toRight(s"Unsupported TravelKind: $value"))
