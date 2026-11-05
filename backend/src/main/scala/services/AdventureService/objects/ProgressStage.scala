package services.AdventureService.objects
import io.circe.{Encoder,Decoder}
enum ProgressStage:
  case arrival, ready, cleared, ending, finished
object ProgressStage:
  def toString(value: ProgressStage): String = value.toString
  def fromString(value: String): Either[String,ProgressStage] = values.find(_.toString == value).toRight(s"Unsupported ProgressStage: $value")
  given Encoder[ProgressStage] = Encoder.encodeString.contramap(toString)
  given Decoder[ProgressStage] = Decoder.decodeString.emap(fromString)
