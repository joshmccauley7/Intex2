/// <summary>
/// Four derived status levels for staff scanning. Values are always lowercase: green, yellow, red.
/// Risk is inverted: green = low risk (good), red = high/critical risk (bad).
/// </summary>
public record ResidentStatusIndicatorsDto(string Health, string Education, string Counseling, string Risk, string ReintegrationProgress = "yellow");
