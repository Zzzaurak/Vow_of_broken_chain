package services.AdventureService.objects
import io.circe.{Encoder,Decoder}
enum Difficulty:
  case easy, hard
object Difficulty:
  def toString(value: Difficulty): String = value.toString
  def fromString(value: String): Either[String,Difficulty] = values.find(_.toString == value).toRight(s"Unsupported Difficulty: $value")
  given Encoder[Difficulty] = Encoder.encodeString.contramap(toString)
  given Decoder[Difficulty] = Decoder.decodeString.emap(fromString)
