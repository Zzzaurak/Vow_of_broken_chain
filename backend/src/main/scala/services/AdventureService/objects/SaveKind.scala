package services.AdventureService.objects
import io.circe.{Encoder,Decoder}
enum SaveKind:
  case auto, manual
object SaveKind:
  def toString(value: SaveKind): String = value.toString
  def fromString(value: String): Either[String,SaveKind] = values.find(_.toString == value).toRight(s"Unsupported SaveKind: $value")
  given Encoder[SaveKind] = Encoder.encodeString.contramap(toString)
  given Decoder[SaveKind] = Decoder.decodeString.emap(fromString)
