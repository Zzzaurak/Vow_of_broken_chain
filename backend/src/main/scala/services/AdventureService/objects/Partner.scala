package services.AdventureService.objects
import io.circe.{Encoder,Decoder}
enum Partner:
  case glm, gpt, claude
object Partner:
  def toString(value: Partner): String = value.toString
  def fromString(value: String): Either[String,Partner] = values.find(_.toString == value).toRight(s"Unsupported Partner: $value")
  given Encoder[Partner] = Encoder.encodeString.contramap(toString)
  given Decoder[Partner] = Decoder.decodeString.emap(fromString)
