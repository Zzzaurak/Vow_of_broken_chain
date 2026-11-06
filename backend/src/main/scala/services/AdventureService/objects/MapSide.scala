package services.AdventureService.objects
import io.circe.{Encoder, Decoder}
enum MapSide:
  case north, south, west, east
object MapSide:
  given Encoder[MapSide] = Encoder.encodeString.contramap(_.toString)
  given Decoder[MapSide] = Decoder.decodeString.emap(value => values.find(_.toString == value).toRight(s"Unsupported MapSide: $value"))
