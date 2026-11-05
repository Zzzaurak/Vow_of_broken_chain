package services.AdventureService.objects.apiTypes
import io.circe.{Encoder,Decoder}
import io.circe.generic.semiauto.*
import services.AdventureService.objects.{AdventureRecord,SaveRecord}
final case class SaveListResponse(revision: Long, continueSave: Option[String], adventures: List[AdventureRecord], saves: List[SaveRecord])
object SaveListResponse:
  given Encoder[SaveListResponse] = deriveEncoder
  given Decoder[SaveListResponse] = deriveDecoder
