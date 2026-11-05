package services.system.objects
final case class ApiError(code: String, detail: String, status: Int = 400) extends RuntimeException(detail)
