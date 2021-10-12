package notifiers

import (
	"testing"

	"github.com/grafana/grafana/pkg/components/simplejson"
	"github.com/grafana/grafana/pkg/models"
	secretsManager "github.com/grafana/grafana/pkg/services/secrets/manager"
	"github.com/grafana/grafana/pkg/services/sqlstore"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestSensuGoNotifier(t *testing.T) {
	json := `{ }`

	secretsService := secretsManager.SetupTestService(t, sqlstore.InitTestDB(t))
	settingsJSON, err := simplejson.NewJson([]byte(json))
	require.NoError(t, err)
	model := &models.AlertNotification{
		Name:     "Sensu Go",
		Type:     "sensugo",
		Settings: settingsJSON,
	}

	_, err = NewSensuGoNotifier(model, secretsService.GetDecryptedValue)
	require.Error(t, err)

	json = `
	{
		"url": "http://sensu-api.example.com:8080",
		"entity": "grafana_instance_01",
		"check": "grafana_rule_0",
		"namespace": "default",
		"handler": "myhandler",
		"apikey": "abcdef0123456789abcdef"
	}`

	settingsJSON, err = simplejson.NewJson([]byte(json))
	require.NoError(t, err)
	model = &models.AlertNotification{
		Name:     "Sensu Go",
		Type:     "sensugo",
		Settings: settingsJSON,
	}

	not, err := NewSensuGoNotifier(model, secretsService.GetDecryptedValue)
	require.NoError(t, err)
	sensuGoNotifier := not.(*SensuGoNotifier)

	assert.Equal(t, "Sensu Go", sensuGoNotifier.Name)
	assert.Equal(t, "sensugo", sensuGoNotifier.Type)
	assert.Equal(t, "http://sensu-api.example.com:8080", sensuGoNotifier.URL)
	assert.Equal(t, "grafana_instance_01", sensuGoNotifier.Entity)
	assert.Equal(t, "grafana_rule_0", sensuGoNotifier.Check)
	assert.Equal(t, "default", sensuGoNotifier.Namespace)
	assert.Equal(t, "myhandler", sensuGoNotifier.Handler)
	assert.Equal(t, "abcdef0123456789abcdef", sensuGoNotifier.APIKey)
}
