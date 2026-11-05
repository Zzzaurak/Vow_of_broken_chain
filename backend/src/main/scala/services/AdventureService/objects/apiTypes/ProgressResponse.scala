package services.AdventureService.objects.apiTypes
import io.circe.{Encoder,Decoder}
import io.circe.generic.semiauto.*
import services.AdventureService.objects.SaveRecord
final case class ProgressResponse(revision: Long, save: SaveRecord)
object ProgressResponse:
  given Encoder[ProgressResponse] = deriveEncoder
  given Decoder[ProgressResponse] = deriveDecoder
