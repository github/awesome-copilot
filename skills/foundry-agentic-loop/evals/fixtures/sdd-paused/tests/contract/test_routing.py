from src.backend.routing import route


def test_low_routes_to_fast_track():
    assert route("low") == "fast-track"


def test_high_routes_to_senior_adjuster():
    assert route("high") == "senior-adjuster"
