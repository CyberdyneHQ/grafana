package notifiers

import (
	"testing"

	"github.com/grafana/grafana/pkg/components/simplejson"
	"github.com/grafana/grafana/pkg/models"
	secretsManager "github.com/grafana/grafana/pkg/services/secrets/manager"
	"github.com/grafana/grafana/pkg/services/sqlstore"
	. "github.com/smartystreets/goconvey/convey"
)

func TestLineNotifier(t *testing.T) {
	Convey("Line notifier tests", t, func() {
		secretsService := secretsManager.SetupTestService(t, sqlstore.InitTestDB(t))
		Convey("empty settings should return error", func() {
			json := `{ }`

			settingsJSON, _ := simplejson.NewJson([]byte(json))
			model := &models.AlertNotification{
				Name:     "line_testing",
				Type:     "line",
				Settings: settingsJSON,
			}

			_, err := NewLINENotifier(model, secretsService.GetDecryptedValue)
			So(err, ShouldNotBeNil)
		})
		Convey("settings should trigger incident", func() {
			json := `
			{
  "token": "abcdefgh0123456789"
			}`
			settingsJSON, _ := simplejson.NewJson([]byte(json))
			model := &models.AlertNotification{
				Name:     "line_testing",
				Type:     "line",
				Settings: settingsJSON,
			}

			not, err := NewLINENotifier(model, secretsService.GetDecryptedValue)
			lineNotifier := not.(*LineNotifier)

			So(err, ShouldBeNil)
			So(lineNotifier.Name, ShouldEqual, "line_testing")
			So(lineNotifier.Type, ShouldEqual, "line")
			So(lineNotifier.Token, ShouldEqual, "abcdefgh0123456789")
		})
	})
}
