package services.AdventureService.objects
import io.circe.{Encoder, Decoder}
import io.circe.generic.semiauto.*
final case class Cooldowns(water: Double, glm: Double, gpt: Double, claude: Double)
object Cooldowns:
  given Encoder[Cooldowns] = deriveEncoder
  given Decoder[Cooldowns] = deriveDecoder
