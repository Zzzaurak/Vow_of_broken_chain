package services.AdventureService.objects
import io.circe.{Encoder, Decoder}
enum ExplorationReward:
  case rice, pearl, scale, core, heal, restore
object ExplorationReward:
  given Encoder[ExplorationReward] = Encoder.encodeString.contramap(_.toString)
  given Decoder[ExplorationReward] = Decoder.decodeString.emap(value => values.find(_.toString == value).toRight(s"Unsupported ExplorationReward: $value"))
