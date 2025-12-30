import pytest
from unittest.mock import patch, MagicMock
from app.services.scheduler import download_and_import_job

@patch("app.services.scheduler.import_csv_feed")
@patch("app.services.scheduler.requests.get")
@patch("app.services.scheduler.os.remove")
@patch("app.services.scheduler.update_coming_soon_status")
def test_download_and_import_job(mock_update, mock_remove, mock_get, mock_import):
    """Testar scheduler-jobbet med mockad nätverkstrafik."""
    
    test_config = [
        {"store": "TestButik", "url": "http://fake-url.com/feed.csv"}
    ]
    
    with patch("app.services.scheduler.FEED_CONFIG", test_config):
        # Mocka respons
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.iter_content.return_value = [b"data"]
        mock_get.return_value.__enter__.return_value = mock_response

        # Kör
        download_and_import_job()

        # Verifiera
        mock_get.assert_called_with("http://fake-url.com/feed.csv", stream=True)
        mock_import.assert_called()
        mock_remove.assert_called()