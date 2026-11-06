package services.AdventureService.objects
import io.circe.{Encoder, Decoder}
import io.circe.generic.semiauto.*
final case class GrowthItem(id: ExplorationReward, name: String, hp: Double, mp: Double, regen: Double, melee: Double, water: Double, radius: Double)
object GrowthItem:
  given Encoder[GrowthItem] = deriveEncoder
  given Decoder[GrowthItem] = deriveDecoder
